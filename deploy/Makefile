BINARY_NAME := mdplanner
INSTALL_DIR := /usr/local/bin
SERVICE_FILE := deploy/mdplanner.service
SERVICE_NAME := mdplanner
DATA_DIR     := /var/lib/mdplanner

.PHONY: install uninstall start stop restart status logs

install:
	sudo cp dist/$(BINARY_NAME)-linux $(INSTALL_DIR)/$(BINARY_NAME)
	sudo chmod +x $(INSTALL_DIR)/$(BINARY_NAME)
	sudo useradd --system --create-home --home-dir $(DATA_DIR) $(BINARY_NAME) 2>/dev/null || true
	sudo mkdir -p $(DATA_DIR)/project
	sudo chown -R $(BINARY_NAME):$(BINARY_NAME) $(DATA_DIR)
	sudo cp $(SERVICE_FILE) /etc/systemd/system/$(SERVICE_NAME).service
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE_NAME)
	sudo systemctl start $(SERVICE_NAME)

uninstall:
	sudo systemctl stop $(SERVICE_NAME) || true
	sudo systemctl disable $(SERVICE_NAME) || true
	sudo rm -f /etc/systemd/system/$(SERVICE_NAME).service
	sudo systemctl daemon-reload
	sudo rm -f $(INSTALL_DIR)/$(BINARY_NAME)
	sudo userdel -r $(BINARY_NAME) || true

start:
	sudo systemctl start $(SERVICE_NAME)

stop:
	sudo systemctl stop $(SERVICE_NAME)

restart:
	sudo systemctl restart $(SERVICE_NAME)

status:
	sudo systemctl status $(SERVICE_NAME)

logs:
	sudo journalctl -u $(SERVICE_NAME) -f
