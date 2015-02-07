﻿(function(factory) {
    if (breeze) {
        factory(breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    }
}(function(breeze) {
       
    var core = breeze.core;

    var MetadataStore = breeze.MetadataStore;
    var JsonResultsAdapter = breeze.JsonResultsAdapter;
    var AbstractDataServiceAdapter = breeze.AbstractDataServiceAdapter;
    var AutoGeneratedKeyType = breeze.AutoGeneratedKeyType;

    var ajaxImpl;

    function fmtOData(val) {
        return val == null ? null : "'" + val + "'" ; 
    } 

    function getNextObjectId() {
        return new ObjectId().toString();
    }

    var ctor = function () {
        this.name = "mongo";
        breeze.DataType.MongoObjectId = breeze.DataType.addSymbol({
            defaultValue: "",
            fmtOData: fmtOData,
            getNext: getNextObjectId
        });
    };

    ctor.prototype = new AbstractDataServiceAdapter();
    
    ctor.prototype._prepareSaveBundle = function(saveBundle, saveContext) {
        var em = saveContext.entityManager;
        var metadataStore = em.metadataStore;
        var helper = em.helper;
        var metadata = {};
        
        saveBundle.entities = saveBundle.entities.map(function (e) {
            var rawEntity = helper.unwrapInstance(e);
            var entityTypeName = e.entityType.name;
            var etInfo = metadata[entityTypeName];
            if (!etInfo) {
                etInfo = {};
                var entityType = e.entityType;
                etInfo.entityTypeName = entityTypeName;
                etInfo.defaultResourceName = entityType.defaultResourceName;
                etInfo.autoGeneratedKeyType =  entityType.autoGeneratedKeyType.name;
                etInfo.dataProperties = entityType.dataProperties.map(function(dp) {
                    var p = { name: dp.nameOnServer, dataType: dp.dataType.name };
                    if (dp.relatedNavigationProperty != null) {
                        p.isFk = true;
                    }
                    if (dp.concurrencyMode && dp.concurrencyMode === "Fixed") {
                        p.isConcurrencyProp = true;
                    }
                    return p;
                });

                metadata[entityTypeName] = etInfo;
                if (!metadata.defaultNamespace) {
                    metadata.defaultNamespace = e.entityType.namespace;
                }
            }
            var originalValuesOnServer = helper.unwrapOriginalValues(e, metadataStore);

            rawEntity.entityAspect = {
                entityTypeName: entityTypeName,
                entityState: e.entityAspect.entityState.name,
                originalValuesMap: originalValuesOnServer
            };
            return rawEntity;
        });

        saveBundle.metadata = metadata;
        saveBundle.saveOptions = { tag: saveBundle.saveOptions.tag };

        return saveBundle;
    };

    ctor.prototype._prepareSaveResult = function (saveContext, data) {
        
        var em = saveContext.entityManager;
        var keys = data.insertedKeys.concat(data.updatedKeys, data.deletedKeys);
        var entities = [];
        keys.forEach(function (key) {
            var entity = em.getEntityByKey(key.entityTypeName, key._id);
            // entities created on the server will not be via getEntityByKey and hence null;
            if (entity) {
                entities.push(entity);
            }
        });

        if (data.entitiesCreatedOnServer.length > 0) {
            entities = entities.concat(data.entitiesCreatedOnServer);
        }

        return { entities: entities, keyMappings: data.keyMappings, httpResponse: data.httpResponse };
    };


    ctor.prototype.jsonResultsAdapter = new JsonResultsAdapter({
        name: "mongo",

        visitNode: function (node, mappingContext, nodeContext) {
            if (node == null) return {};
            var result = {};
            // this will only be set on saveResults and projections.
            if (node.$type) {
                result.entityType = mappingContext.entityManager.metadataStore._getEntityType(node.$type, true);
            }
            return result;
        }
    });

    /*
    *
    * Copyright (c) 2011 Justin Dearing (zippy1981@gmail.com)
    * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
    * and GPL (http://www.opensource.org/licenses/gpl-license.php) version 2 licenses.
    * This software is not distributed under version 3 or later of the GPL.
    *
    * Version 1.0.0
    *
    */

    /*
     * Javascript class that mimics how WCF serializes a object of type MongoDB.Bson.ObjectId
     * and converts between that format and the standard 24 character representation.
    */
    if (this.document) {
        var ObjectId = (function () {
            var increment = 0;
            var pid = Math.floor(Math.random() * (32767));
            var machine = Math.floor(Math.random() * (16777216));

            if (typeof (localStorage) != 'undefined') {
                var mongoMachineId = parseInt(localStorage['mongoMachineId']);
                if (mongoMachineId >= 0 && mongoMachineId <= 16777215) {
                    machine = Math.floor(localStorage['mongoMachineId']);
                }
                // Just always stick the value in.
                localStorage['mongoMachineId'] = machine;
                document.cookie = 'mongoMachineId=' + machine + ';expires=Tue, 19 Jan 2038 05:00:00 GMT'
            }
            else if (document) {
                var cookieList = document.cookie.split('; ');
                for (var i in cookieList) {
                    var cookie = cookieList[i].split('=');
                    if (cookie[0] == 'mongoMachineId' && cookie[1] >= 0 && cookie[1] <= 16777215) {
                        machine = cookie[1];
                        break;
                    }
                }
                document.cookie = 'mongoMachineId=' + machine + ';expires=Tue, 19 Jan 2038 05:00:00 GMT';

            }

            return function () {
                if (!(this instanceof ObjectId)) {
                    return new ObjectId(arguments[0], arguments[1], arguments[2], arguments[3]).toString();
                }

                if (typeof (arguments[0]) == 'object') {
                    this.timestamp = arguments[0].timestamp;
                    this.machine = arguments[0].machine;
                    this.pid = arguments[0].pid;
                    this.increment = arguments[0].increment;
                }
                else if (typeof (arguments[0]) == 'string' && arguments[0].length == 24) {
                    this.timestamp = Number('0x' + arguments[0].substr(0, 8)),
                    this.machine = Number('0x' + arguments[0].substr(8, 6)),
                    this.pid = Number('0x' + arguments[0].substr(14, 4)),
                    this.increment = Number('0x' + arguments[0].substr(18, 6))
                }
                else if (arguments.length == 4 && arguments[0] != null) {
                    this.timestamp = arguments[0];
                    this.machine = arguments[1];
                    this.pid = arguments[2];
                    this.increment = arguments[3];
                }
                else {
                    this.timestamp = Math.floor(new Date().valueOf() / 1000);
                    this.machine = machine;
                    this.pid = pid;
                    if (increment > 0xffffff) {
                        increment = 0;
                    }
                    this.increment = increment++;

                }
            };
        })();

        ObjectId.prototype.getDate = function () {
            return new Date(this.timestamp * 1000);
        };

        /*
        * Turns a WCF representation of a BSON ObjectId into a 24 character string representation.
        */
        ObjectId.prototype.toString = function () {
            var timestamp = this.timestamp.toString(16);
            var machine = this.machine.toString(16);
            var pid = this.pid.toString(16);
            var increment = this.increment.toString(16);
            return '00000000'.substr(0, 6 - timestamp.length) + timestamp +
                   '000000'.substr(0, 6 - machine.length) + machine +
                   '0000'.substr(0, 4 - pid.length) + pid +
                   '000000'.substr(0, 6 - increment.length) + increment;
        }
    }
    
    breeze.config.registerAdapter("dataService", ctor);

}));