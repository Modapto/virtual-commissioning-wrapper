#!/bin/sh
docker image rm modaptovc.client
docker buildx build --load -t modaptovc.client -f src/modaptovc.Client/Dockerfile . && docker image save modaptovc.client -o docker-compose/modaptovc.client.tar.gz

docker image rm modaptovc.server
docker buildx build --load -t modaptovc.server -f src/modaptovc.Server/Dockerfile . && docker image save modaptovc.server -o docker-compose/modaptovc.server.tar.gz