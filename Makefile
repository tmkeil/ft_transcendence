.DEFAULT_GOAL := help

UNAME_S := $(shell uname -s)

up:
	@echo "Starting Services..."
	docker compose up --build -d
	docker ps -a

down:
	@echo "Stopping and removing Services..."
	docker compose down
	rm -rf ./services/frontend/node_modules ./packages/shared/dist

prune: down
	@echo "Nuking all Services..."
	docker system prune -af --volumes

re: down up

reset: prune up


help:
	@echo "----------------------------------------------------"
	@echo "Makefile for ft_transcendence (Simple Setup)"
	@echo "----------------------------------------------------"
	@echo "Available commands:"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop and remove all services"
	@echo "  make re        - Remove and restart all services"
	@echo "----------------------------------------------------"

.PHONY: up down re help
