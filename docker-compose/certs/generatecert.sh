#!/bin/sh

openssl ecparam -out root.key -name prime256v1 -genkey
openssl req -new -sha256 -key root.key -out root.csr -subj "/C=DE/ST=Baden-Württemberg/L=Weingarten/O=EKS InTec GmbH/OU=DI/CN=EKS ModaptoVC-Wrapper Test CA v1"
openssl x509 -req -sha256 -days 365 -in root.csr -signkey root.key -out root.crt

openssl ecparam -out modaptovc.key -name prime256v1 -genkey
openssl req -new -sha256 -key modaptovc.key -out modaptovc.csr -subj "/C=DE/ST=Baden-Württemberg/L=Weingarten/O=EKS InTec GmbH/OU=DI/CN=modaptovc-test.de"
openssl x509 -req -in modaptovc.csr -CA root.crt -CAkey root.key -CAcreateserial -out modaptovc.crt -days 365 -sha256

openssl x509 -in modaptovc.crt -text -noout
