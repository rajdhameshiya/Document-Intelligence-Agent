import express from 'express';
import { ManagerDashboard } from '../types';
import { ok } from '../utils/api';
import { getDocuments, getExceptions, getShipments } from '../utils/dataLayer';

export const dashboardRouter = express.Router();

const DEMO_NOW = new Date('2024-01-18T20:00:00Z');

dashboardRouter.get('/manager', (_req, res) => {
  const shipments = getShipments();
  const documents = getDocuments();
  const exceptions = getExceptions();
  const openExceptions = exceptions.filter((exception) => exception.status !== 'resolved');

  const pipeline = shipments.map((shipment) => {
    const shipmentExceptions = openExceptions.filter((exception) => exception.shipmentId === shipment.id);
    const criticalExceptions = shipmentExceptions.filter((exception) => exception.severity === 'critical').length;
    return {
      shipment,
      documentsComplete: Object.values(shipment.documentsReceived).filter(Boolean).length,
      documentsTotal: 4,
      openExceptions: shipmentExceptions.length,
      criticalExceptions,
      risk: calculateRisk(shipment.cutoffDate, criticalExceptions)
    };
  });

  const execNames = Array.from(new Set(shipments.map((shipment) => shipment.assignedExec)));
  const dashboard: ManagerDashboard = {
    stats: {
      activeShipments: shipments.filter((shipment) => shipment.status !== 'bl_submitted').length,
      documentsInQueue: documents.filter((document) => ['pending', 'processing', 'flagged'].includes(document.status)).length,
      openExceptions: openExceptions.length,
      atRisk: pipeline.filter((row) => row.risk === 'Critical' || row.risk === 'High').length
    },
    pipeline,
    exceptionsSummary: openExceptions.slice(0, 5),
    execWorkload: execNames.map((execName, index) => ({
      execName,
      shipments: shipments.filter((shipment) => shipment.assignedExec === execName).length,
      docsProcessedToday: documents.filter((document) => document.processedAt).length + index,
      openExceptions: openExceptions.filter((exception) => exception.assignedTo === execName).length,
      avgBLTime: index === 0 ? '32 min' : '28 min'
    }))
  };

  return ok(res, dashboard);
});

dashboardRouter.get('/exec/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const shipments = getShipments().filter((shipment) => shipment.assignedExec === name);
  const exceptions = getExceptions().filter((exception) => exception.assignedTo === name && exception.status !== 'resolved');
  const documents = getDocuments().filter((document) => shipments.some((shipment) => shipment.id === document.shipmentId));
  return ok(res, { shipments, documents, exceptions });
});

function calculateRisk(cutoffDate: string, criticalExceptions: number): 'Critical' | 'High' | 'Medium' | 'Low' {
  const hoursToCutoff = (new Date(cutoffDate).getTime() - DEMO_NOW.getTime()) / (1000 * 60 * 60);
  if (hoursToCutoff <= 24 && criticalExceptions > 0) return 'Critical';
  if (hoursToCutoff <= 48 || criticalExceptions > 0) return 'High';
  if (hoursToCutoff <= 72) return 'Medium';
  return 'Low';
}
