.PHONY: build test clean install

build:
	go build -o ../bin/tinapple-tui .

test:
	go test -v ./...

clean:
	rm -f ../bin/tinapple-tui

install: build
	install -Dm755 ../bin/tinapple-tui $(DESTDIR)/usr/bin/tinapple-tui
