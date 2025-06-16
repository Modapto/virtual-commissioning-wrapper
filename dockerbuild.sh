#!/bin/sh
docker image rm modaptovc.client
docker buildx build --load -t modaptovc.client -f src/modaptovc.Client/Dockerfile .
mkdir bin
docker image save modaptovc.client -o bin/modaptovc.Client.tar.gz

docker image rm modaptovc.server
docker buildx build --load -t modaptovc.server -f src/modaptovc.Server/Dockerfile .
docker image save modaptovc.server -o bin/modaptovc.Server.tar.gz
