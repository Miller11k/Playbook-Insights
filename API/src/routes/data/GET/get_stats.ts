import { Router, Request, Response } from 'express';
import { printRouteHit } from '../../../helpers/routePrintHelper.js';
import { fetchData } from '../../../helpers/fetchData.js';
import { isValidTeamID, isValidPlayerID } from '../../../helpers/validateHelper.js';
import {
  min,
  max,
  median,
  mode,
  variance,
  standardDeviation
} from '../../../helpers/dataScience/statistics.js';
import { stat } from 'fs';

const router = Router();

const invalidStatTypes = new Set([
  'team roster',
  'team info',
  'player info'
]);

router.get('/', async (req: Request, res: Response) => {
    printRouteHit("GET", "/stats");

    const statTypeHeader = req.headers['x-stats-type']?.toString().toLowerCase();
    const entityTypeHeader = req.headers['x-entity-type']?.toString().toLowerCase();

    // Check if statTypeHeader is present
    if (!entityTypeHeader) {
        res.status(400).json({ error: "Missing x-entity-type header." });
        return;
    }
    // Check if statTypeHeader is present
    if (!statTypeHeader) {
        res.status(400).json({ error: "Missing x-stats-type header." });
        return;
    }

    const validEntities = ['player', 'team'];
    const validPlayerStats = ['extra','passing', 'receiving', 'rushing']
    const validTeamStats = ['results', 'defensive', 'offensive', 'passing', 'receiving', 'rushing', 'special']

    // Check if entityTypeHeader is valid
    if (!validEntities.includes(entityTypeHeader)) {
        res.status(400).json({ error: "Invalid x-entity-type header." });
        return;
    }
    // Check if statTypeHeader is valid
    if (entityTypeHeader === 'player' && !validPlayerStats.includes(statTypeHeader)) {
        res.status(400).json({ error: "Invalid x-stats-type header for player entity." });
        return;
    }
    if (entityTypeHeader === 'team' && !validTeamStats.includes(statTypeHeader)) {
        res.status(400).json({ error: "Invalid x-stats-type header for team entity." });
        return;
    }

    // If team, verify Team Code is valid
    if (entityTypeHeader === 'team') {
        if (!req.query.team) {
            res.status(400).json({ error: "No team provided" });
            return;
        } else if (!isValidTeamID(req.query.team as string)) {
            res.status(400).json({ error: "Invalid team ID" });
            return;
        }
    }
    // If player, verify Player ID is valid
    if (entityTypeHeader === 'player') {
        if (!req.query.id) {
            res.status(400).json({ error: "No player provided" });
            return;
        } else if (!isValidPlayerID(req.query.id as string)) {
            res.status(400).json({ error: "Invalid player ID" });
            return;
        }
    }


    const data = await fetchData(req);

    if (!data) {
        res.status(204).send();
        return;
    }

    const fieldMap: Map<string, any[]> = new Map();

    if (Array.isArray(data) && typeof data[0] === 'object') {
        const keys = Object.keys(data[0]);
        for (const key of keys) {
            fieldMap.set(key, data.map(item => item[key]));
        }
    } else if (typeof data === 'object') {
        const keys = Object.keys(data);
        for (const key of keys) {
            fieldMap.set(key, [data[key]]);
        }
    } else {
        res.status(400).json({ error: "Unexpected data format." });
        return;
    }

    const statsJSON: Record<string, any> = {};

    for (const [key, values] of fieldMap.entries()) {
        const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
        statsJSON[key] = {
            min: min(numericValues),
            max: max(numericValues),
            median: median(numericValues),
            mode: mode(numericValues),
            variance: variance(numericValues),
            std_dev: standardDeviation(numericValues),
        };
    }

    res.status(200).json(statsJSON);
});

export default router;