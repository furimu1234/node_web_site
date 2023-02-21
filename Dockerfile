FROM node:latest

WORKDIR /usr/src/app

COPY . .

RUN npm install yarn

RUN yarn install
RUN fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
RUN sysctl -p

EXPOSE 8080
