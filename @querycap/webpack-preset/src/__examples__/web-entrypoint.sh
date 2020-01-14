#!/bin/sh

envsubst '$PROJECT_REF $APP_CONFIG $ENV' < /etc/nginx/conf.d/site.template > /etc/nginx/conf.d/default.conf
nginx -g 'daemon off;'

exec "$@"  
