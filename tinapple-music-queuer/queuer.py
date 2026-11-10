#!/usr/bin/env python3
"""
Tinapple Music Queuer (antra-queuer)
Automated Lossless FLAC Downloader & Library Manager for Navidrome / Tinapple OS.
Connects to Antra (https://antra.hoshi.cfd) to queue and fetch FLAC 16-bit streams,
chunked within the 100-item batch limit, with robust error management and retries.
"""

import os
import sys
import json
import time
import shutil
import zipfile
import asyncio
import logging
import argparse
import requests
import websockets
from datetime import datetime

def _resolve_paths():
    home = os.path.expanduser("~")
    cfg_p = os.path.join(home, ".config", "tinapple", "music_queuer.json")
    queue_p = os.path.join(home, ".config", "tinapple", "music_queue.json")
    log_p = os.path.join(home, ".config", "tinapple", "music_queuer.log")

    pineapple_queue = "/home/pineapple/.config/tinapple/music_queue.json"
    if not os.path.exists(queue_p) and os.path.exists(pineapple_queue):
        queue_p = pineapple_queue
        cfg_p = "/home/pineapple/.config/tinapple/music_queuer.json"
        log_p = "/home/pineapple/.config/tinapple/music_queuer.log"

    return cfg_p, queue_p, log_p

DEFAULT_CONFIG_PATH, DEFAULT_QUEUE_PATH, DEFAULT_LOG_PATH = _resolve_paths()

DEFAULT_CONFIG = {
    "base_url": "https://antra.hoshi.cfd",
    "username": "pineapple",
    "password": "pine@2507",
    "output_dir": "/srv/media/music",
    "format": "lossless-16",
    "max_batch_size": 100,
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("tinapple-music-queuer")

def load_config():
    if os.path.exists(DEFAULT_CONFIG_PATH):
        try:
            with open(DEFAULT_CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                res = DEFAULT_CONFIG.copy()
                res.update(cfg)
                return res
        except Exception as e:
            logger.warning(f"Error loading config: {e}. Using defaults.")
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    os.makedirs(os.path.dirname(DEFAULT_CONFIG_PATH), exist_ok=True)
    with open(DEFAULT_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

def load_queue():
    if os.path.exists(DEFAULT_QUEUE_PATH):
        try:
            with open(DEFAULT_QUEUE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading queue file: {e}. Starting fresh.")
    return {"items": []}

def save_queue(q):
    os.makedirs(os.path.dirname(DEFAULT_QUEUE_PATH), exist_ok=True)
    tmp_path = DEFAULT_QUEUE_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(q, f, indent=2)
    try:
        os.chmod(tmp_path, 0o664)
    except Exception:
        pass
    os.replace(tmp_path, DEFAULT_QUEUE_PATH)
    if os.geteuid() == 0 and "home/pineapple" in DEFAULT_QUEUE_PATH:
        try:
            import pwd
            p_uid = pwd.getpwnam("pineapple").pw_uid
            p_gid = pwd.getpwnam("pineapple").pw_gid
            os.chown(DEFAULT_QUEUE_PATH, p_uid, p_gid)
        except Exception:
            pass

class AntraSession:
    def __init__(self, cfg):
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": cfg["user_agent"]})
        self.logged_in = False

    def login(self):
        url = f"{self.cfg['base_url']}/api/auth/login"
        payload = {"username": self.cfg["username"], "password": self.cfg["password"]}
        res = self.session.post(url, json=payload, timeout=20)
        if res.status_code == 200:
            self.logged_in = True
            logger.info(f"Successfully authenticated as {self.cfg['username']}")
            return True
        else:
            raise RuntimeError(f"Login failed: HTTP {res.status_code} - {res.text}")

    def ensure_login(self):
        if not self.logged_in:
            self.login()

    def resolve(self, playlist_url):
        self.ensure_login()
        url = f"{self.cfg['base_url']}/api/resolve"
        payload = {"url": playlist_url, "format": self.cfg["format"]}
        res = self.session.post(url, json=payload, timeout=45)
        if res.status_code != 200:
            raise RuntimeError(f"Failed to resolve URL {playlist_url}: HTTP {res.status_code} {res.text}")
        return res.json()

    def create_job(self, playlist_url, start_idx, end_idx, max_retries=15, retry_delay=45):
        self.ensure_login()
        url = f"{self.cfg['base_url']}/api/jobs"
        payload = {
            "url": playlist_url,
            "format": self.cfg["format"],
            "start_index": start_idx,
            "end_index": end_idx,
            "client_packaging": False
        }
        for attempt in range(1, max_retries + 1):
            res = self.session.post(url, json=payload, timeout=30)
            if res.status_code in (200, 201):
                return res.json()
            if res.status_code == 429:
                detail = res.text
                try:
                    detail = res.json().get("detail", detail)
                except Exception:
                    pass
                logger.warning(f"Antra is busy / rate-limited (attempt {attempt}/{max_retries}): {detail}. Waiting {retry_delay}s...")
                time.sleep(retry_delay)
                continue
            if res.status_code == 401:
                self.login()
                continue
            raise RuntimeError(f"Failed to create job: HTTP {res.status_code} {res.text}")
        raise RuntimeError(f"Failed to create job after {max_retries} attempts: Antra server is busy.")

    async def run_job_stream(self, job_id, ws_token, on_progress=None, on_track_failed=None):
        cookie_header = "; ".join([f"{c.name}={c.value}" for c in self.session.cookies])
        ws_url = f"wss://{self.cfg['base_url'].replace('https://', '').replace('http://', '')}/api/jobs/{job_id}/ws?ws_token={ws_token}"
        headers = {
            "User-Agent": self.cfg["user_agent"],
            "Cookie": cookie_header
        }

        logger.info(f"Connecting WebSocket stream: {ws_url}")
        async with websockets.connect(ws_url, additional_headers=headers, ping_interval=20, ping_timeout=60) as ws:
            async for raw in ws:
                try:
                    evt = json.loads(raw)
                except Exception:
                    continue

                evt_type = evt.get("type")
                if evt_type == "track_started":
                    title = evt.get("title", "Unknown")
                    artist = evt.get("artist", "")
                    idx = evt.get("index", 0)
                    total = evt.get("total", 0)
                    logger.info(f"  [>] Track {idx+1}/{total} started: {title} - {artist}")
                elif evt_type == "track_resolved":
                    title = evt.get("title", "")
                    quality = evt.get("quality", "FLAC")
                    source = evt.get("source", "master")
                    logger.info(f"  [✓] Resolved: {title} via {source} ({quality})")
                elif evt_type == "track_done":
                    done = evt.get("done", 0)
                    total = evt.get("total", 0)
                    title = evt.get("title", "")
                    logger.info(f"  [DONE] Track {done}/{total} finished: {title}")
                    if on_progress:
                        on_progress(done, total)
                elif evt_type == "track_failed":
                    title = evt.get("title", "")
                    err = evt.get("error", "Unknown error")
                    logger.warning(f"  [!] Track failed: {title} ({err})")
                    if on_track_failed:
                        on_track_failed(title, err)
                elif evt_type == "complete":
                    logger.info(f">>> Download packaging complete: {evt.get('filename')}")
                    return evt
                elif evt_type == "error":
                    raise RuntimeError(f"Job failed on server: {evt.get('message')}")

    def download_job_archive(self, job_id, filename, dest_dir):
        dl_url = f"{self.cfg['base_url']}/api/jobs/{job_id}/download"
        tmp_zip = os.path.join("/tmp", f"job_{job_id}_{filename}")
        logger.info(f"Downloading finished package: {dl_url} -> {tmp_zip}")
        
        with self.session.get(dl_url, stream=True, timeout=180) as r:
            r.raise_for_status()
            with open(tmp_zip, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    if chunk:
                        f.write(chunk)

        file_size_mb = os.path.getsize(tmp_zip) / (1024 * 1024)
        logger.info(f"Downloaded {file_size_mb:.2f} MB. Extracting to {dest_dir}...")

        os.makedirs(dest_dir, exist_ok=True)
        if zipfile.is_zipfile(tmp_zip):
            with zipfile.ZipFile(tmp_zip, 'r') as zip_ref:
                for member in zip_ref.infolist():
                    if member.is_dir():
                        continue
                    basename = os.path.basename(member.filename)
                    if not basename or basename.startswith('.'):
                        continue
                    target_path = os.path.join(dest_dir, basename)
                    with zip_ref.open(member) as source, open(target_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    try:
                        os.chmod(target_path, 0o664)
                    except Exception:
                        pass
        else:
            # Single audio track served directly (not zipped)
            clean_name = os.path.basename(filename) or "track.flac"
            target_path = os.path.join(dest_dir, clean_name)
            shutil.copyfile(tmp_zip, target_path)
            try:
                os.chmod(target_path, 0o664)
            except Exception:
                pass

        try:
            os.remove(tmp_zip)
        except Exception:
            pass

        try:
            os.chmod(dest_dir, 0o2775)
        except Exception:
            pass

        # Apply maximum lossless FLAC level 8 compression post-download
        if shutil.which("flac"):
            logger.info("Applying maximum lossless compression (FLAC level 8)...")
            import subprocess
            for root, _, files in os.walk(dest_dir):
                for f in files:
                    if f.lower().endswith(".flac"):
                        full_f = os.path.join(root, f)
                        try:
                            subprocess.run(["flac", "-8", "--force", "--silent", full_f], check=False)
                        except Exception:
                            pass

        logger.info(f"Successfully extracted and optimized FLAC files into: {dest_dir}")
        return True

def add_url_to_queue(url):
    cfg = load_config()
    client = AntraSession(cfg)
    logger.info(f"Resolving metadata for {url}...")
    try:
        data = client.resolve(url)
    except Exception as e:
        logger.error(f"Resolution failed for {url}: {e}")
        return False

    name = data.get("release_name") or "Playlist"
    tracks = data.get("tracks") or []
    total_count = len(tracks)
    max_batch = cfg.get("max_batch_size", 100)

    batches = []
    if total_count == 0:
        batches.append({"start": 0, "end": 100, "status": "pending", "done": 0, "total": 0, "failed_tracks": []})
    else:
        for start in range(0, total_count, max_batch):
            end = min(start + max_batch, total_count)
            batches.append({
                "start": start,
                "end": end,
                "status": "pending",
                "done": 0,
                "total": end - start,
                "failed_tracks": []
            })

    q = load_queue()
    for item in q["items"]:
        if item["url"] == url:
            logger.info(f"URL already in queue: {name} ({total_count} tracks)")
            return True

    item_record = {
        "id": f"q_{int(time.time()*1000)}",
        "url": url,
        "name": name,
        "artist": data.get("artist") or "",
        "total_tracks": total_count,
        "batches": batches,
        "status": "pending",
        "added_at": datetime.now().isoformat(),
        "completed_at": None,
        "error": None
    }
    q["items"].append(item_record)
    save_queue(q)
    logger.info(f"Added to queue: '{name}' with {total_count} tracks ({len(batches)} batch(es))")
    return True

def sanitize_folder_name(name):
    return "".join(c for c in name if c not in '\\/:*?"<>|').strip() or "Playlist"

def process_queue():
    cfg = load_config()
    client = AntraSession(cfg)
    
    while True:
        q = load_queue()
        target_item = None
        target_batch_idx = None

        for item in q["items"]:
            if item["status"] in ("pending", "in_progress", "partial"):
                for b_idx, b in enumerate(item["batches"]):
                    if b["status"] == "pending":
                        target_item = item
                        target_batch_idx = b_idx
                        break
                if target_item:
                    break

        if not target_item:
            logger.info("All queued items are completed or no pending batches. Standing by.")
            break

        item = target_item
        batch = item["batches"][target_batch_idx]
        item["status"] = "in_progress"
        batch["status"] = "in_progress"
        save_queue(q)

        folder_name = sanitize_folder_name(item.get("folder") or item["name"])
        dest_dir = os.path.join(cfg["output_dir"], "Playlists", folder_name)

        logger.info(f"\n========================================================")
        logger.info(f"Processing: '{item['name']}' Batch [{batch['start']}:{batch['end']}]")
        logger.info(f"Target Directory: {dest_dir}")
        logger.info(f"========================================================")

        batch_failed_tracks = []

        try:
            job_info = client.create_job(item["url"], batch["start"], batch["end"])
            job_id = job_info["job_id"]
            ws_token = job_info["ws_token"]

            def on_progress(done, total):
                batch["done"] = done
                batch["total"] = total
                save_queue(q)

            def on_track_failed(t_title, t_err):
                batch_failed_tracks.append({"title": t_title, "error": t_err, "time": datetime.now().isoformat()})
                batch["failed_tracks"] = batch_failed_tracks
                save_queue(q)

            evt = asyncio.run(client.run_job_stream(
                job_id,
                ws_token,
                on_progress=on_progress,
                on_track_failed=on_track_failed
            ))
            filename = evt.get("filename") or f"{folder_name}.zip"

            client.download_job_archive(job_id, filename, dest_dir)

            batch["status"] = "completed"
            batch["done"] = batch["total"]
            logger.info(f"Batch completed: '{item['name']}' [{batch['start']}:{batch['end']}]")

        except Exception as e:
            logger.error(f"Error processing batch: {e}")
            batch["status"] = "failed"
            batch["error"] = str(e)
            item["error"] = str(e)

        all_completed = all(b["status"] == "completed" for b in item["batches"])
        any_failed = any(b["status"] == "failed" for b in item["batches"])

        if all_completed:
            item["status"] = "completed"
            item["completed_at"] = datetime.now().isoformat()
            logger.info(f"✓ FULL PLAYLIST COMPLETED: '{item['name']}'")
            updater = "/srv/media/music/Playlists/update_playlists.py"
            if os.path.exists(updater):
                try:
                    import subprocess
                    subprocess.run([updater], check=False)
                except Exception:
                    pass
        elif any_failed and not any(b["status"] == "pending" for b in item["batches"]):
            item["status"] = "partial"

        save_queue(q)
        time.sleep(3)

def show_status():
    q = load_queue()
    items = q.get("items", [])
    print("\n═════════════════════════════════════════════════════════════════════════")
    print("                    🎵 TINAPPLE MUSIC QUEUE STATUS                       ")
    print("═════════════════════════════════════════════════════════════════════════")
    if not items:
        print("  Queue is empty. Use `tinapple-music-queuer add <url>` to add playlists.")
        print("═════════════════════════════════════════════════════════════════════════\n")
        return

    for idx, it in enumerate(items, 1):
        status = it.get("status", "pending").upper()
        name = it.get("name", "Unknown")
        total = it.get("total_tracks", 0)
        batches = it.get("batches", [])
        completed_batches = sum(1 for b in batches if b.get("status") == "completed")
        print(f"[{idx}] {name} (ID: {it.get('id', 'N/A')}) — {total} tracks")
        print(f"    Status: {status} | Batches: {completed_batches}/{len(batches)} | Added: {it.get('added_at')[:19]}")
        for b_i, b in enumerate(batches, 1):
            b_st = b.get("status", "pending")
            failed_count = len(b.get("failed_tracks", []))
            fail_str = f" ({failed_count} tracks skipped/failed)" if failed_count > 0 else ""
            print(f"      • Batch {b_i} [{b['start']}:{b['end']}]: {b_st} (done: {b.get('done', 0)}/{b.get('total', 0)}){fail_str}")
        if it.get("error"):
            print(f"      ⚠ Notice: {it.get('error')}")
    print("═════════════════════════════════════════════════════════════════════════\n")

def show_errors():
    q = load_queue()
    items = q.get("items", [])
    found_errors = False
    print("\n═════════════════════════════════════════════════════════════════════════")
    print("                     ⚠ TINAPPLE QUEUE ERROR MANAGER                      ")
    print("═════════════════════════════════════════════════════════════════════════")

    for it in items:
        it_err = it.get("error")
        batches = it.get("batches", [])
        failed_batches = [b for b in batches if b.get("status") == "failed"]
        batches_with_failed_tracks = [b for b in batches if b.get("failed_tracks")]

        if it_err or failed_batches or batches_with_failed_tracks:
            found_errors = True
            print(f"\n● Playlist: '{it.get('name')}' (ID: {it.get('id')})")
            if it_err:
                print(f"   Batch/Pipeline Error: {it_err}")
            for b_i, b in enumerate(batches, 1):
                if b.get("error"):
                    print(f"   • Batch {b_i} [{b['start']}:{b['end']}]: Failed ({b.get('error')})")
                for ft in b.get("failed_tracks", []):
                    print(f"     - Track: '{ft.get('title')}' → Reason: {ft.get('error')}")

    if not found_errors:
        print("  ✓ Zero errors recorded! All active items and batches are healthy.")
    else:
        print("\nTip: Use `tinapple-music-queuer retry` to re-queue failed batches,")
        print("     or `tinapple-music-queuer remove <id>` to remove an item.")
    print("═════════════════════════════════════════════════════════════════════════\n")

def retry_queue(target_id=None):
    q = load_queue()
    retried_count = 0

    for it in q["items"]:
        if target_id and it.get("id") != target_id and str(target_id) != str(q["items"].index(it) + 1):
            continue

        had_error = False
        for b in it.get("batches", []):
            if b.get("status") == "failed":
                b["status"] = "pending"
                b["error"] = None
                retried_count += 1
                had_error = True

        if had_error or it.get("status") in ("failed", "partial"):
            it["status"] = "pending"
            it["error"] = None
            logger.info(f"Reset playlist '{it.get('name')}' to PENDING.")

    save_queue(q)
    print(f"✓ Retried {retried_count} batch(es). Background service will automatically re-process them.")

def remove_item(target_id):
    q = load_queue()
    original_len = len(q["items"])
    new_items = []

    for idx, it in enumerate(q["items"], 1):
        if it.get("id") == target_id or str(target_id) == str(idx):
            logger.info(f"Removed item '{it.get('name')}' from queue.")
            continue
        new_items.append(it)

    q["items"] = new_items
    save_queue(q)
    if len(new_items) < original_len:
        print(f"✓ Removed 1 item from queue.")
    else:
        print(f"⚠ Item '{target_id}' not found in queue.")

def clear_errors():
    q = load_queue()
    cleared = 0
    for it in q["items"]:
        it["error"] = None
        for b in it.get("batches", []):
            if b.get("failed_tracks"):
                b["failed_tracks"] = []
                cleared += 1
            if b.get("error"):
                b["error"] = None
    save_queue(q)
    print(f"✓ Cleared error logs for {cleared} batch(es).")

def main():
    parser = argparse.ArgumentParser(description="Tinapple Antra Music Queuer")
    subparsers = parser.add_subparsers(dest="command")

    add_parser = subparsers.add_parser("add", help="Add one or more playlist/album URLs to the queue")
    add_parser.add_argument("urls", nargs="+", help="Spotify or Apple Music URLs")

    subparsers.add_parser("run", help="Run the queue processor in foreground")
    subparsers.add_parser("status", help="Show current queue status")
    subparsers.add_parser("list", help="List queued items")
    subparsers.add_parser("errors", help="Show detailed track and batch errors")

    retry_parser = subparsers.add_parser("retry", help="Retry failed items or batches")
    retry_parser.add_argument("--id", help="Specific playlist ID or 1-based index (default: all failed)")

    rm_parser = subparsers.add_parser("remove", help="Remove an item from the queue")
    rm_parser.add_argument("id", help="Playlist ID or 1-based index to remove")

    subparsers.add_parser("clear-errors", help="Clear error logs and warnings from queue")

    args = parser.parse_args()
    if args.command == "add":
        for u in args.urls:
            add_url_to_queue(u.strip())
    elif args.command == "run":
        process_queue()
    elif args.command == "errors":
        show_errors()
    elif args.command == "retry":
        retry_queue(args.id)
    elif args.command == "remove":
        remove_item(args.id)
    elif args.command == "clear-errors":
        clear_errors()
    elif args.command in ("status", "list") or not args.command:
        show_status()

if __name__ == "__main__":
    main()
