const Ajv = require('ajv')
const {userGroupSchema} = require("./jsonschema");
const ajv = new Ajv({discriminator: true});
require("ajv-keywords")(ajv)

function  validateUsingAjvBySchema(schemaName, req, res, next){
    try{
        if (!ajv.validate(schemaName, req.body)) {
            return next(false, 400, {message: ajv.errorsText()})
        } else {
            return next(true)
        }
    }catch(e){
        return next(false, 400, {message: e.message})
    }
   
}

/* SAMPLE CODE
=========================
exports.validateQueryFormulaSchema = function (req,res,next){
    validateUsingAjvBySchema(validationForFormulaEvaluation,req,res,next);
}
exports.validateCreateFormulaSchema = function (req,res,next){
    validateUsingAjvBySchema(createValidationForFormula,req,res,next);
}
exports.validateUpdateFormulaSchema = function (req,res,next){
    validateUsingAjvBySchema(updateValidationForFormula,req,res,next);
} */

    exports.validate = function (req,res,next){
        validateUsingAjvBySchema(validationForFormulaEvaluation,req,res,next);
    }