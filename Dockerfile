FROM node:12

WORKDIR /usr/src/app

COPY . .

RUN npm install yarn

RUN yarn install
sysctl fs.inotify.max_user_watches=24288

EXPOSE 8080
