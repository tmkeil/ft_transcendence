.DEFAULT_GOAL := help

UNAME_S := $(shell uname -s)

up:
ifeq ($(UNAME_S),Linux)
	@echo "Starting Services on Linux..."
	sudo docker compose up --build -d
else ifeq ($(UNAME_S),Darwin)
	@echo "Starting Services on macOS..."
	docker compose up --build -d
endif

down:
ifeq ($(UNAME_S),Linux)
	@echo "Stopping and removing Services on Linux..."
	sudo docker compose down -v
else ifeq ($(UNAME_S),Darwin)
	@echo "Stopping and removing Services on macOS..."
	docker compose down -v
endif

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

.PHONY: up down re help
