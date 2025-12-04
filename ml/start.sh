#!/bin/bash
cd /var/www/newsdetection/ml
/var/www/newsdetection/ml/venv/bin/gunicorn -w 2 -b 127.0.0.1:7000 --timeout 1800 --graceful-timeout 60 app:app
