FROM node:22-alpine
WORKDIR /app

# Dépendances d'abord : cette couche reste en cache tant que package*.json ne change pas
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# data/ contient l'état persistant (volume) : il doit appartenir à l'utilisateur non-root
RUN mkdir -p data && chown node:node data
USER node

CMD ["node", "index.js"]
