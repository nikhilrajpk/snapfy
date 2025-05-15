#!/bin/bash
su - postgres -c "psql -c 'CREATE DATABASE snapfy;' || true"