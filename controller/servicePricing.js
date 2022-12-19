const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const express = require('express');
const router = express.Router();
const Validator = require("validator");
const isEmpty = require("is-empty");
const validateServicePricingInput = require("../validation/servicePricing");

async function addServicePricing(req,res,next){ 
    try{
    const {errors,isValid} = validateServicePricingInput.validateServicePricingInput(req.body);
    if(!isValid){ 
        return res.status(400).json({
            'error_code':101,
            'status':false,
            'errors':errors});
    }else{
        var address = await db.user_charge.findOne({
            where:{
                user_id:req.body.user_id,
                service:req.body.service,
                charge_type:req.body.charge_type,
                fees:req.body.fees,
                recurring_fee:req.body.recurring_fee
            }
        });
        if(address){ 
            return res.status(409).json({
                'error_code':102,
                'status':false,
                'errors':'Service price is already added for the user.'
            })
        }
        
        var result = await db.user_charge.create(req.body);
            if(result){
                res.status(200).json({
                    error:"false",
                    status:"Success",
                    message:'Service price is successfully Added.',
                    data:result
                })
            }else{
                return res.status(500).json({
                    'error_code':109,
                        'status':false, 
                        'errors':'Service price is not added. Please try again after some time.'
                    })
            }
        }
        }catch(error){
            return res.status(500).json(
                {
                    error_code:101,
                    status:false,
                    errors:`${error}`
                }
            )
    }
}

async function updateServicePricing(req,res,next){
    try{
    const { errors, isValid } = validateServicePricingInput.validateServicePricingInput
      // Check validation 
        if (!isValid) {
          return res.status(400).json({
            error:true,
            status:false,  
            errors});
        }
        
        var address = await db.user_charge.update(req.body,{where:{id:req.body.id}});
        console.log(address);
        if (address == 0 || !address) {
            return res.status(404).json({ error_code:106,
            status:false,
            errors:"Service charge is not updated. Please try again!"});
          }
         delete(req.body.id); 
        return res.status(200).json({ 
        error:false,  
        status:"Success",
        data:req.body
        })
        }catch(error){
            return res.status(500).json({
                error_code:105,
                status:false,
                error:`${error}`
            })
        } 
} 

async function removeServicePrice(req,res,next){
    try{
        let errors = {};
       // console.log("I am in");
      let id = !isEmpty(req.params.id) ?req.params.id: "";
      
      if (Validator.isEmpty(id)) { 
        errors.id = "Address id is Empty";
      }
      // Check validation  
        if (!isEmpty(errors)) {
          return res.status(400).json({
            error:true,  
            status:false,  
            errors:errors});
        }
        var address_data = await db.user_charge.destroy({where:{id:id}});
        if(address_data){
           return res.status(200).json({
                error:false,
                status:"Success",
                message:"Service price deleted successfully",
                data:address_data
            })
        }else{
           return res.status(404).json({
                error:true,
                status:false,
                message:"Service not deleted. please try again"
            })
        }
    }catch(error){
        return res.status(500).json({
            error_code:105,
            status:false,
            error:`${error}` 
        })
    }
}

async function getServiceByPriceId(req,res,next){
    try{
        let errors = {};
        //console.log("I am in");
      let id = !isEmpty(req.params.id) ?req.params.id: "";

      if (Validator.isEmpty(id)) { 
        errors.id = "Service id is Empty";
      }
      // Check validation  
        if (!isEmpty(errors)) {
          return res.status(400).json({
            error:true,  
            status:false,  
            errors:errors});
        }
        let attributes = ['id','service','charge_type','fees','recurring_fee','title','details','valid_till'];
        let address_data = await db.user_charge.findOne({where:{id:id}});
        if(address_data){
           return res.status(200).json({
                error:false,
                status:"Success",
                data:address_data
            })
        }else{
           return res.status(404).json({
                error:true,
                status:false,
                message:"Service price detail not found. Please try again"
            })
        }
    }catch(error){
        return res.status(500).json({
            error_code:105,
            status:false,
            error:`${error}` 
        })
    } 
}

async function servicePriceList(req,res,next){
    try{
        var limit = ((req.body.limit)?(req.body.limit):25);
		var index = ((req.body.offset)?(req.body.index):1);

      if(req.body.search_key){
        var condition_where = {
            [Op.or]:[
            {
                service:{[Op.like]:"%"+req.body.search_key+"%"},
            },{
                charge_type:{[Op.like]:"%"+req.body.search_key+"%"}
            },{
                title:{[Op.like]:"%"+req.body.search_key+"%"}
            }
            ]
        };  
    }
        let attributes = ['id','service','charge_type','fees','recurring_fee','title','details','valid_till'];
        let address_data = await db.user_charge.findAndCountAll(
            {
                attributes,
                limit: ((index)*(limit)),
                offset: (index-1),
                where:condition_where
            });
        if(address_data){
           return res.status(200).json({
                error:false,
                status:"Success",
                data:address_data
            })
        }else{
           return res.status(404).json({
                error:true,
                status:false,
                message:"Service price detail not found. Please try again"
            })
        }
    }catch(error){
        return res.status(500).json({
            error_code:105,
            status:false,
            error:`${error}` 
        })
    }
}

module.exports = {addServicePricing,updateServicePricing,servicePriceList,removeServicePrice,getServiceByPriceId}
