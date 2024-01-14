FROM node:18
USER root

RUN curl -fsSL https://code-server.dev/install.sh | sh

RUN npm install pm2 -g

WORKDIR /app
RUN npm init -y
RUN npm pkg set type="module"
RUN npm install tsdaemon@1.0.6
RUN mkdir -p /app/automations

COPY ./deploy/deploy.config.cjs /app/deploy.config.cjs
COPY ./deploy/startup.sh /app/startup.sh
COPY ./deploy/settings.json /root/.local/share/code-server/Machine/settings.json

EXPOSE 8080
CMD ["/app/startup.sh"]