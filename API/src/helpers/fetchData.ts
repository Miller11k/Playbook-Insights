import { Response, Request } from 'express';
import {
  getPlayerExtraData,
  getPlayerInfo,
  getPlayerPassingStats,
  getPlayerReceivingStats,
  getPlayerRushingStats,
} from '../routes/players/GET/index.js';

import {
  getGameResults,
  getTeamDefensiveStats,
  getTeamInfo,
  getTeamOffensiveStats,
  getTeamPassingStats,
  getTeamReceivingStats,
  getTeamRecord,
  getTeamRoster,
  getTeamRushingStats,
  getSpecialTeamsStats,
} from '../routes/teams/GET/index.js';

export async function fetchData(req: Request): Promise<any> {
    let capturedData: any = null;

    // mock Response object to intercept res.json(data)
    const mockRes = {
        status: (code: number) => mockRes,
        json: (data: any) => {
            capturedData = data;
            return mockRes;
        }
    } as unknown as Response;

    const entityType = req.headers['x-entity-type']?.toString().toLowerCase();
    const statsType = req.headers['x-stats-type']?.toString().toLowerCase();

    if (!entityType || !statsType) return null;

    try {
        switch (entityType) {
            case 'player':
                switch (statsType) {
                    case 'extra': await getPlayerExtraData(req, mockRes); break;
                    case 'info': await getPlayerInfo(req, mockRes); break;
                    case 'passing': await getPlayerPassingStats(req, mockRes); break;
                    case 'receiving': await getPlayerReceivingStats(req, mockRes); break;
                    case 'rushing': await getPlayerRushingStats(req, mockRes); break;
                    default: return null;
                }
                break;
            case 'team':
                switch (statsType) {
                    case 'results': await getGameResults(req, mockRes); break;
                    case 'defensive': await getTeamDefensiveStats(req, mockRes); break;
                    case 'info': await getTeamInfo(req, mockRes); break;
                    case 'offensive': await getTeamOffensiveStats(req, mockRes); break;
                    case 'passing': await getTeamPassingStats(req, mockRes); break;
                    case 'receiving': await getTeamReceivingStats(req, mockRes); break;
                    case 'record': await getTeamRecord(req, mockRes); break;
                    case 'roster': await getTeamRoster(req, mockRes); break;
                    case 'rushing': await getTeamRushingStats(req, mockRes); break;
                    case 'special': await getSpecialTeamsStats(req, mockRes); break;
                    default: return null;
                }
                break;
            default:
                return null;
        }
    } catch (err) {
        console.error("Error in fetchData:", err);
        return null;
    }

    return capturedData;
}