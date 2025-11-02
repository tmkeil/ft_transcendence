.DEFAULT_GOAL := help

UNAME_S := $(shell uname -s)

build:
	@echo " _____  __    _        __  __    ___   __    __  ___  __    __  ___   __ "
	@echo "/__   \\/__\\  /_\\    /\\ \\ \\/ _\\  / __\\ /__\\/\\ \\ \\/   \\/__\\/\\ \\ \\/ __\\ /__\\"
	@echo "  / /\\/ \\// //_\\\\  /  \\/ /\\ \\  / /   /_\\ /  \\/ / /\\ /_\\ /  \\/ / /   /_\\  "
	@echo " / / / _  \\/  _  \\/ /\\  / _\\ \\/ /___//__/ /\\  / /_///__/ /\\  / /___//__  "
	@echo " \\/  \\/ \\_/\\_/ \\_/\\_\\ \\/  \\__/\\____/\\__/\\_\\ \\/___,'\\__/\\_\\ \\/\\____/\\__/  "
	@echo "by Team Babylonians"
	@echo
	@echo "Building Services..."
	docker compose up --build -d
	docker ps -a

up:
	@echo "Starting Services..."
	docker compose up -d
	docker ps -a

down:
	@echo "Stopping Services..."
	docker compose down
	rm -rf ./services/frontend/node_modules ./packages/shared/dist

prune: down
	@echo "Nuking Everything..."
	docker system prune -af --volumes
	rm -rf ./services/backend/data/database.sqlite
	find ./services/backend/data/public/user_pfps -mindepth 1 ! -name 'default.png' -exec rm -rf {} +

re: down build

reset: prune build

help:
	@echo "----------------------------------------------------"
	@echo "Makefile for ft_transcendence (Simple Setup)"
	@echo "----------------------------------------------------"
	@echo "Available commands:"
	@echo "  make build     - Build all services"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make re        - Stop and rebuild all services"
	@echo "  make prune     - Stop and remove all services and data"
	@echo "  make reset     - Stop and totally reset with prune"
	@echo "----------------------------------------------------"

.PHONY: build up down re prune reset help
