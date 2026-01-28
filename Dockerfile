FROM node:22-alpine

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

WORKDIR /opt

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY *.ts ./

# CMD ["npm", "run", "serve"] --> this will not work, because npm will terminate as soon as the term signal is received.
CMD ["node", "--experimental-strip-types", "index.ts"]
