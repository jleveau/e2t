const express = require('express');
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;

class RouteExpedition {

    constructor(mongo, dbName, collectionName){
        this.mongo = mongo;
        this.dbName = dbName;
        this.collectionName = collectionName;

        this.add = this.add.bind(this);
        this.list = this.list.bind(this);
    }

    async init(){
        let router = express.Router({ mergeParams: true });  // mergeParams to retrieve parent route params
        router.use(passport.authenticate('jwt', {failureRedirect: '/login' , session:false}));  //TODO Redirect should be taken into account by the React routes

        router.post('/', this.add);
        router.get('/', this.list);

        return router;
    }

    async add(req, res){
        let campaignCollection = this.mongo.db(this.dbName).collection('campaign');
        let expeditionCollection = this.mongo.db(this.dbName).collection('expedition');
        let explorator = req.user;
        let events = req.body.events;
        let campaign = await campaignCollection.findOne({_id: new ObjectID(req.params.campaignId)});

        if(campaign && campaign.explorators.includes(explorator.username)){
            await expeditionCollection.insertOne({_id: new ObjectID(), events: events});
            res.send({message: 'Inserted new expedition'});
        }
        else{
            res.send({message: 'Campaign doesn\'t exist or you didn\'t join it'});
        }
    }

    async list(req, res){
        let campaignCollection = this.mongo.db(this.dbName).collection('campaign');
        let expeditionCollection = this.mongo.db(this.dbName).collection('expedition');
        let explorator = req.user;
        let campaign = await campaignCollection.findOne({_id: new ObjectID(req.params.campaignId)});

        if(campaign && campaign.explorators.includes(explorator.username)){
            let expeditions = await expeditionCollection.find({explorators: explorator.username}).toArray();
            res.send({
                expeditions: expeditions,
                message: 'Successfully retrieved expeditions'
            });
        }
        else{
            res.send({
                expeditions: [],
                message: 'Campaign doesn\'t exist or you didn\'t join it'
            });
        }
    }
}

module.exports = RouteExpedition;