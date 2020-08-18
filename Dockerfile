FROM node:14.3.0-alpine

RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

# copy package.json and install dependencies
# apk add --no-cache --virtual <name> <packages...> to install temporary packages
# delete that temporary package to delete all packages installed
# allows for optimisation of the layers
COPY package.json ./
RUN apk add --update \
    && apk add --no-cache --virtual .build git curl build-base g++ \
    && npm install \
    && apk del .build

# copy full project
COPY . .

# run the bot
CMD ["npm", "run", "dev"]
