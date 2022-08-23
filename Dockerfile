FROM alpine:3.16

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

RUN apk add --no-cache --update --upgrade nodejs yarn curl util-linux

COPY ./ /opt
WORKDIR /opt

RUN yarn install --production

# CMD ["yarn", "serve"] --> this will not work, because yarn will terminated as soon as the term signal is received.
CMD ["node", "index.js"]
