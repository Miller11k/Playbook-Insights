// This is to be called after the data has been collected using other endpoints.
// This endpoint will call the helper functions to calculate the stats from the data.
// The data will be passed to the helper functions.
// The endpoint will return the stats as a JSON response.

import { Request, Response, Router } from 'express';
import { printRouteHit} from '../../../helpers/routePrintHelper.js';
import { isValidPlayerID, isValidTeamID } from '../../../helpers/validateHelper.js';
import { playerDBClient } from '../../../config/dbConfig.js';

export async function getStats(){
    printRouteHit("GET", "/stats");

}