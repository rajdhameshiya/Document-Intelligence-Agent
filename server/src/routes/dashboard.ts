import { Router } from 'express';
import { store } from '../utils/dataStore';

const router = Router();

function getRisk(cutoffDate: string, hasCritical: boolean): 'critical' | 'high' | 'medium' | 'low' {
  const hours = (new Date(cutoffDate).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hours <= 24 && hasCritical) return 'critical';
  if (hours <= 48 || hasCritical) return 'high';
  if (hours <= 72) return 'medium';
  return 'low';
}

router.get('/manager', (_, res) => {
  const shipments = store.getShipments();
  const docs = store.getDocuments();
  const exceptions = store.getExceptions();

  const pipeline = shipments.map((s) => {
    const ex = exceptions.filter((e) => e.shipmentId === s.id && e.status !== 'resolved');
    const docsCount = [s.documentsReceived.bookingConfirmation, s.documentsReceived.shippingInstruction, s.documentsReceived.commercialInvoice, s.documentsReceived.packingList].filter(Boolean).length;
    const hasCritical = ex.some((e) => e.severity === 'critical');
    return { shipmentId: s.id, referenceNumber: s.referenceNumber, exec: s.assignedExec, status: s.status, documents: docsCount, exceptions: ex.length, cutoffDate: s.cutoffDate, risk: getRisk(s.cutoffDate, hasCritical) };
  });

  const execMap: Record<string, any> = {};
  pipeline.forEach((p) => {
    if (!execMap[p.exec]) execMap[p.exec] = { execName: p.exec, shipments: 0, docsProcessedToday: 0, openExceptions: 0, avgBLTime: Math.floor(Math.random() * 20) + 28 };
    execMap[p.exec].shipments += 1;
    execMap[p.exec].openExceptions += p.exceptions;
  });
  docs.filter((d) => d.processedAt && new Date(d.processedAt).toDateString() === new Date().toDateString()).forEach((d) => {
    const ship = shipments.find((s) => s.id === d.shipmentId);
    if (ship && execMap[ship.assignedExec]) execMap[ship.assignedExec].docsProcessedToday += 1;
  });

  res.json({ success: true, data: {
    stats: {
      activeShipments: shipments.length,
      documentsInQueue: docs.filter((d) => ['pending', 'processing'].includes(d.status)).length,
      openExceptions: exceptions.filter((e) => e.status !== 'resolved').length,
      atRisk: pipeline.filter((p) => ['critical', 'high'].includes(p.risk)).length
    },
    pipeline,
    execWorkload: Object.values(execMap)
  } });
});

router.get('/exec/:name', (req, res) => {
  const shipments = store.getShipments().filter((s) => s.assignedExec === req.params.name);
  const exceptions = store.getExceptions().filter((e) => e.assignedTo === req.params.name && e.status !== 'resolved');
  res.json({ success: true, data: { shipments, exceptions } });
});

export default router;
