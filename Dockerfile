# Below steps created were run and an image named dockerregistry.athmin.com:5000/nodebase:14.18.1 was created.
# Paste the commented code in Dockerfile
#FROM node:14.18.1 as nodebase
#LABEL COMPANY="Athmin Technologies"
#LABEL MAINTAINER="techsupport@athmin.com"
#LABEL APPLICATION="Node Application"
#RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list
#RUN echo `ls -la`
#RUN echo `apt-get update`
#RUN echo `apt-get install -y  vim`
#RUN echo `apt-get install -y bind9-host` 
#RUN npm install pm2 -g
#RUN pm2 install typescript

#After creating the above Dockerfile. Run the below commands to create a new Docker
#docker build -t dockerregistry.athmin.com:5000/nodebase:14.18.1  --network=host  .
#docker tag dockerregistry.athmin.com:5000/nodebase:14.18.1 dockerregistry.athmin.com:5000/nodebase:14.18.1
#docker push dockerregistry.athmin.com:5000/nodebase:14.18.1

FROM dockerregistry.athmin.com:5000/nodebase:20.19.4
ARG PRONNEL_ENV

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#COPY package*.json ./
COPY . /usr/src/app

RUN npm install  -–legacy-peer-deps --verbose
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
#COPY . .

RUN echo $PRONNEL_ENV
ENV PRONNEL_ENV_VALUE=$PRONNEL_ENV
CMD ["sh", "-c", "npm run $PRONNEL_ENV_VALUE"]
