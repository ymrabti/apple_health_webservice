FROM node:iron-alpine AS builder

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
USER root
RUN yarn install --pure-lockfile --only=production
COPY --chown=root:root . .
RUN yarn build

RUN mkdir -p /usr/src/healthy

FROM node:iron-alpine

RUN mkdir -p /usr/src/app \
 && mkdir -p /usr/src/healthy/_temp_ \
 && chown -R node:node /usr/src/app \
 && chown -R node:node /usr/src/healthy


WORKDIR /usr/src/app

COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/package.json ./
COPY --chown=node:node --from=builder /usr/src/app/yarn.lock ./
COPY --chown=node:node --from=builder /usr/src/app/google-services.json /usr/src/app/dist/google-services.json
COPY --chown=node:node --from=builder /usr/src/app/ecosystem.config.json ./ecosystem.config.json


USER node
RUN yarn install --pure-lockfile --production

EXPOSE 7384
CMD ["yarn", "start"]

# ssh-keygen -t rsa -b 4096
# ssh-copy-id majal@192.168.1.77
# ssh majal@192.168.1.77

## docker context create remote-msi-majal --docker "host=ssh://majal@192.168.1.77"
## docker context use remote-msi-majal
## docker-compose up --build -d
