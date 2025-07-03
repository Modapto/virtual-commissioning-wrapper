FROM node:alpine AS build
WORKDIR /app

COPY src/modaptovc.Client/package*.json ./
RUN npm install --force

COPY src/modaptovc.Client/ ./
RUN npm run build

FROM nginx 
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/default.conf /etc/nginx/conf.d/default.conf

