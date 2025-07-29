.DEFAULT_GOAL := help

up:
	@echo "Starting services..."
	docker compose up --build -d

# Stops and removes all services, networks, and volumes.
down:
	@echo "Stopping and removing services..."
	docker compose down -v

# Reboots all services, networks, and volumes.
re: down up

help:
	@echo "----------------------------------------------------"
	@echo "Makefile for ft_transcendence (Simple Setup)"
	@echo "----------------------------------------------------"
	@echo "Available commands:"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop and remove all services"
	@echo "  make re        - Remove and restart all services"
	@echo "----------------------------------------------------"

.PHONY: up down logs help
