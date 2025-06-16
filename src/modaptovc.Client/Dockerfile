FROM node:23-alpine
WORKDIR /app
COPY src/modaptovc.Client/package*.json ./
RUN npm install
COPY src/modaptovc.Client/ ./
EXPOSE 55083
CMD ["npm", "run", "dev"]
