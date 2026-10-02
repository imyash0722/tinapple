/* tinapple-chadwm config.def.h - dwm fork configuration for tinapple OS
 * Mod key: Super (MOD4)
 * Based on chadwm (github.com/siduck/chadwm) */

#ifndef CONFIG_DEF_H
#define CONFIG_DEF_H

/* Appearance */
static const unsigned int borderpx  = 2;        /* border pixel of windows */
static const unsigned int snap      = 32;       /* snap pixel */
static const unsigned int gappih    = 10;       /* horiz inner gap between windows */
static const unsigned int gappiv    = 10;       /* vert inner gap between windows */
static const unsigned int gappoh    = 10;       /* horiz outer gap between windows and screen edge */
static const unsigned int gappov    = 10;       /* vert outer gap between windows and screen edge */
static const int smartgaps          = 1;        /* 1 means no outer gap when only one window */
static const int showbar            = 1;        /* 0 means no bar */
static const int topbar             = 1;        /* 0 means bottom bar */
static const int vertpad            = 0;        /* vertical padding of bar */
static const int sidepad            = 0;        /* horizontal padding of bar */
static const int overviewgaps       = 1;        /* gaps in overview mode */

static const char *fonts[]          = { "JetBrainsMono Nerd Font:size=10", "Noto Color Emoji:size=10" };
static const char dmenufont[]       = "JetBrainsMono Nerd Font:size=10";

/* Tokyo Night colors (default rice) */
static const char col_gray1[]       = "#1a1b26";
static const char col_gray2[]       = "#24283b";
static const char col_gray3[]       = "#414868";
static const char col_gray4[]       = "#c0caf5";
static const char col_cyan[]        = "#7aa2f7";
static const char col_blue[]        = "#7aa2f7";
static const char col_green[]       = "#9ece6a";
static const char col_yellow[]      = "#e0af68";
static const char col_red[]         = "#f7768e";
static const char col_magenta[]     = "#bb9af7";
static const char col_orange[]      = "#ff9e64";

static const char *colors[][3]      = {
	/*               fg         bg         border   */
	[SchemeNorm] = { col_gray4, col_gray1, col_gray2 },
	[SchemeSel]  = { col_gray1, col_cyan,  col_cyan  },
	[SchemeUrg]  = { col_gray1, col_red,   col_red   },
};

/* Tagging */
static const char *tags[] = { "1", "2", "3", "4", "5", "6", "7", "8", "9" };

static const Rule rules[] = {
	/* xprop(1):
	 *	WM_CLASS(STRING) = instance, class
	 *	WM_NAME(STRING) = title
	 */
	/* class      instance    title       tags mask     isfloating   monitor */
	{ "Gimp",     NULL,       NULL,       0,            1,           -1 },
	{ "Firefox",  NULL,       NULL,       1 << 8,       0,           -1 },
	{ "Steam",    NULL,       NULL,       1 << 7,       0,           -1 },
	{ "discord",  NULL,       NULL,       1 << 6,       0,           -1 },
	{ NULL,       NULL,       "tinapple-dash", 0,       0,           -1 },
};

/* Layout(s) */
static const float mfact     = 0.55; /* factor of master area size [0.05..0.95] */
static const int nmaster     = 1;    /* number of clients in master area */
static const int resizehints = 1;    /* 1 means respect size hints in tiled resizals */
static const int lockfullscreen = 1; /* 1 will force focus on the fullscreen window */

static const Layout layouts[] = {
	/* symbol     arrange function */
	{ "[]=",      tile },    /* first entry is default */
	{ "><>",      NULL },    /* no layout function means floating behavior */
	{ "[M]",      monocle },
	{ "|M|",      centeredmaster },
	{ ">M>",      centeredfloatingmaster },
};

/* Key definitions */
#define MODKEY Mod4Mask
#define TAGKEYS(KEY,TAG) \
	{ MODKEY,                       KEY,      view,           {.ui = 1 << TAG} }, \
	{ MODKEY|ControlMask,           KEY,      toggleview,     {.ui = 1 << TAG} }, \
	{ MODKEY|ShiftMask,             KEY,      tag,            {.ui = 1 << TAG} }, \
	{ MODKEY|ControlMask|ShiftMask, KEY,      toggletag,      {.ui = 1 << TAG} },

/* Helper for spawning commands */
#define SHCMD(cmd) { .v = (const char*[]){ "/bin/sh", "-c", cmd, NULL } }
#define STATUSBAR "polybar"

/* Commands */
static const char *termcmd[]  = { "alacritty", NULL };
static const char *browsercmd[]  = { "firefox", NULL };
static const char *filecmd[]  = { "thunar", NULL };
static const char *dashcmd[]  = { "xdg-open", "http://localhost:8088", NULL };
static const char *roficmd[]  = { "rofi", "-show", "drun", NULL };
static const char *powermenu[]  = { "rofi", "-show", "power-menu", "-modi", "power-menu:~/.config/rofi/power-menu.sh", NULL };
static const char *screenshot[] = { "flameshot", "gui", NULL };
static const char *volup[]   = { "wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", "5%+", NULL };
static const char *voldown[] = { "wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", "5%-", NULL };
static const char *volmute[] = { "wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle", NULL };
static const char *brup[]    = { "brightnessctl", "set", "10%+", NULL };
static const char *brdown[]  = { "brightnessctl", "set", "10%-", NULL };
static const char *session_toggle[] = { "tinapple-session", "toggle", NULL };

static const Key keys[] = {
	/* modifier                     key        function        argument */
	{ MODKEY,                       XK_Return, spawn,          {.v = termcmd } },
	{ MODKEY|ShiftMask,             XK_Return, spawn,          {.v = filecmd } },
	{ MODKEY,                       XK_b,      togglebar,      {0} },
	{ MODKEY,                       XK_j,      focusstack,     {.i = +1 } },
	{ MODKEY,                       XK_k,      focusstack,     {.i = -1 } },
	{ MODKEY,                       XK_i,      incnmaster,     {.i = +1 } },
	{ MODKEY,                       XK_d,      incnmaster,     {.i = -1 } },
	{ MODKEY,                       XK_h,      setmfact,       {.f = -0.05} },
	{ MODKEY,                       XK_l,      setmfact,       {.f = +0.05} },
	{ MODKEY|ShiftMask,             XK_h,      setcfact,       {.f = +0.25} },
	{ MODKEY|ShiftMask,             XK_l,      setcfact,       {.f = -0.25} },
	{ MODKEY|ShiftMask,             XK_o,      setcfact,       {.f =  0.00} },
	{ MODKEY,                       XK_space,  zoom,           {0} },
	{ MODKEY|ShiftMask,             XK_space,  togglefloating, {0} },
	{ MODKEY,                       XK_Tab,    view,           {0} },
	{ MODKEY,                       XK_q,      killclient,     {0} },
	{ MODKEY,                       XK_t,      setlayout,      {.v = &layouts[0]} },
	{ MODKEY,                       XK_f,      setlayout,      {.v = &layouts[1]} },
	{ MODKEY,                       XK_m,      setlayout,      {.v = &layouts[2]} },
	{ MODKEY,                       XK_u,      setlayout,      {.v = &layouts[3]} },
	{ MODKEY,                       XK_o,      setlayout,      {.v = &layouts[4]} },
	{ MODKEY,                       XK_comma,  focusmon,       {.i = -1 } },
	{ MODKEY,                       XK_period, focusmon,       {.i = +1 } },
	{ MODKEY|ShiftMask,             XK_comma,  tagmon,         {.i = -1 } },
	{ MODKEY|ShiftMask,             XK_period, tagmon,         {.i = +1 } },
	{ MODKEY,                       XK_n,      viewnext,       {0} },
	{ MODKEY,                       XK_p,      viewprev,       {0} },
	{ MODKEY|ShiftMask,             XK_n,      tagnext,        {0} },
	{ MODKEY|ShiftMask,             XK_p,      tagprev,        {0} },
	TAGKEYS(                        XK_1,                      0)
	TAGKEYS(                        XK_2,                      1)
	TAGKEYS(                        XK_3,                      2)
	TAGKEYS(                        XK_4,                      3)
	TAGKEYS(                        XK_5,                      4)
	TAGKEYS(                        XK_6,                      5)
	TAGKEYS(                        XK_7,                      6)
	TAGKEYS(                        XK_8,                      7)
	TAGKEYS(                        XK_9,                      8)
	{ MODKEY|ShiftMask,             XK_q,      quit,           {0} },
	{ MODKEY|ControlMask|ShiftMask, XK_q,      quit,           {1} }, 

	/* Custom tinapple keybinds */
	{ MODKEY,                       XK_w,      spawn,          {.v = browsercmd } },
	{ MODKEY,                       XK_e,      spawn,          {.v = dashcmd } },
	{ MODKEY,                       XK_r,      spawn,          {.v = roficmd } },
	{ MODKEY|ShiftMask,             XK_r,      spawn,          {.v = powermenu } },
	{ MODKEY,                       XK_Print,  spawn,          {.v = screenshot } },
	{ 0,                            XF86XK_AudioRaiseVolume,  spawn, {.v = volup } },
	{ 0,                            XF86XK_AudioLowerVolume,  spawn, {.v = voldown } },
	{ 0,                            XF86XK_AudioMute,         spawn, {.v = volmute } },
	{ 0,                            XF86XK_MonBrightnessUp,   spawn, {.v = brup } },
	{ 0,                            XF86XK_MonBrightnessDown, spawn, {.v = brdown } },
	{ MODKEY|ControlMask,           XK_s,      spawn,          {.v = session_toggle } },
};

/* Button definitions */
/* click can be ClkTagBar, ClkLtSymbol, ClkStatusText, ClkWinTitle, ClkClientWin, ClkRootWin */
static const Button buttons[] = {
	/* click                event mask      button          function        argument */
	{ ClkLtSymbol,          0,              Button1,        setlayout,      {0} },
	{ ClkLtSymbol,          0,              Button3,        setlayout,      {.v = &layouts[2]} },
	{ ClkWinTitle,          0,              Button2,        zoom,           {0} },
	{ ClkStatusText,        0,              Button2,        spawn,          {.v = termcmd } },
	{ ClkClientWin,         MODKEY,         Button1,        movemouse,      {0} },
	{ ClkClientWin,         MODKEY,         Button2,        togglefloating, {0} },
	{ ClkClientWin,         MODKEY,         Button3,        resizemouse,    {0} },
	{ ClkTagBar,            0,              Button1,        view,           {.ui = 1 << TAG} },
	{ ClkTagBar,            0,              Button3,        toggleview,     {.ui = 1 << TAG} },
	{ ClkTagBar,            0,              Button1|Shift,  tag,            {.ui = 1 << TAG} },
	{ ClkTagBar,            0,              Button3|Shift,  toggletag,      {.ui = 1 << TAG} },
};

#endif /* CONFIG_DEF_H */