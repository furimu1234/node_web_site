FROM node:12

WORKDIR /usr/src/app

COPY . .

RUN npm install yarn

RUN yarn install
RUN pkill -f node

EXPOSE 8080
