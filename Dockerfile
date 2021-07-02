##
## digiserve/ab-file-processor:master
##
## This is our microservice for our AppBuilder Definitions.
##
## Docker Commands:
## ---------------
## $ docker build -t digiserve/ab-file-processor:master .
## $ docker push digiserve/ab-file-processor:master
##

FROM digiserve/service-cli:master

RUN git clone --recursive https://github.com/appdevdesigns/ab_service_file_processor.git app && cd app && git submodule update --recursive && npm install --force

WORKDIR /app

CMD [ "node", "--inspect=0.0.0.0:9229", "app.js" ]
