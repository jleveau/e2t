const MongoClient = require('mongodb').MongoClient;
const winston = require('winston');
const amqp = require('amqplib');
const PropertiesReader = require('properties-reader');
const properties = PropertiesReader('e2t.properties');
const NaturalnessModel = require('./NaturalnessModel.js').NaturalnessModel;
const Event = require('./Event.js').Event;
const Sequence = require('./Sequence.js').Sequence;


const logger = winston.createLogger({
    level: 'info',
    transports: [new winston.transports.Console(),],
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
});

class Cartographer {
    constructor() {
        this.mongoUrl = `mongodb://${properties.path().mongo.host}:${properties.path().mongo.port}`;
        this.dbName = properties.path().mongo.database_name;

        this.rmqUrl = `amqp://${properties.path().rabbit.host}`;
        this.expeditionQueue = properties.path().rabbit.queue_name;
        
        this.naturalnessModelMap = new Map();
    }

    async start() {
        this.mongoClient = await createConnectedMongoClient(this.mongoUrl);
        this.channel = await createRabbitChannelAndCreateQueue(this.rmqUrl, [this.expeditionQueue]);
        try {
            this.channel.prefetch(1);
            this.channel.consume(this.expeditionQueue, msg => {
                if (msg !== null) {
                    this.handleExpeditionCreation(msg);
                }
            });
        }
        catch (e) {
            logger.error(e.stack);
        }
    }

    async handleExpeditionCreation(msg){
        let expedition = JSON.parse(msg.content.toString());
        logger.info(`Received new expedition with id ${expedition.expeditionId}`);
        let collection = this.mongoClient.db(this.dbName).collection('expedition');
        expedition._id = expedition.expeditionId;
        collection.insertOne(expedition).catch(ex => {
            logger.error(`can't save expedition : ${ex}`);
        });

        let model = this.naturalnessModelMap.get(expedition.campaignId);
        if (model === undefined) {
            try  {
                model = await this.createModel(expedition.campaignId);
                this.naturalnessModelMap.set(expedition.campaignId, model);
            } catch (ex) {
                this.channel.nack(msg);
                logger.error(`can't find campaign : ${ex}`);
                return;
            }
        }

        let sequence = extractSequence(expedition)
        let crossEntropy = model.crossEntropy(sequence);
        logger.info(`CrossEntropy ${crossEntropy}`);
        model.learn(sequence);
        let entr = {
            value: crossEntropy,
            date: new Date(),
            expeditionId: expedition.expeditionId,
            userId: expedition.userId,  // TODO userId could be requested with a join when we retrieve entropy list in the front.
            userColor: expedition.userColor  // TODO This could be a design choice and not be stored in the DB, so we have to set a shared config file with colors list
        };

        this.addEntropy(expedition.campaignId, entr)
            .then( () => {
                logger.info(`Save cross entropy`);
                this.channel.ack(msg);
            })
            .catch( (ex) => {
                logger.error(`exception saving entropy ${JSON.stringify(ex)}`);
                this.channel.nack(msg);
            })
    }

    createModel(campaignId) {
        logger.info(`createModel : ${campaignId}`)
        return this.mongoClient.db(this.dbName)
            .collection('campaign')
            .findOne({_id: campaignId})
            .then ( campaign => {
                logger.info(`campaign : ${JSON.stringify(campaign)}`)
                if (campaign === undefined || campaign === null)  {
                    return Promise.reject(new Error('campaign not found'));
                } else {
                    return campaign;
                }
            })
            .then (campaign => {
                logger.info(`campaign : ${JSON.stringify(campaign)}`)
                return Promise.resolve(new NaturalnessModel(campaign.path, campaign.probaOfUnknown));
            });
    }

    addEntropy(campaignId, entropy){
        return this.mongoClient.db(this.dbName)
            .collection('campaign')
            .updateOne(
                {_id: campaignId}, 
                {
                    $push: {crossentropy: entropy},
                    $currentDate: { 
                        lastUpdate: true
                    }
                }
            );
    }


}

module.exports = Cartographer;

async function createConnectedMongoClient(mongoUrl) {
    logger.info("Waiting for MongoDB...");
    let mongoClient = null;
    while (!mongoClient) {
        try {
            mongoClient = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
        }
        catch (e) {  //TODO Catch a lower exception, so that we don't miss an important one...
            logger.debug(e.stack);
            await new Promise((resolve, _) => setTimeout(resolve, 5000));
        }
    }
    logger.info("Successfully connected to MongoDB");
    return mongoClient;
}

async function createRabbitChannelAndCreateQueue(rmqUrl, queueList) {
    logger.info("Waiting for RabbitMQ...");
    let channel = null;
    while (!channel) {
        try {
            let amqpConnection = await amqp.connect(rmqUrl);
            channel = await amqpConnection.createConfirmChannel();
            for (let queuName of queueList) {
                await channel.assertQueue(queuName, { arguments: { "x-queue-mode": "lazy" } });
            }
        }
        catch (e) {  //TODO Catch a lower exception, so that we don't miss an important one...
            logger.debug(e.stack);
            await new Promise((resolve, _) => setTimeout(resolve, 5000));
        }
    }
    logger.info("Successfully connected to RabbitMQ");
    return channel;
}

function extractSequence(expedition) {
    logger.info(`extractSequence:${expedition}`)
    let eventList = expedition.events.map(event => {
        let eventValue = event.type + event.selector + event.value;
        return new Event(eventValue);
    });
    return new Sequence(eventList);
}
