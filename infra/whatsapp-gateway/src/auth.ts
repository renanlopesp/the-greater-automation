import type { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.WHATSAPP_GATEWAY_SECRET
  if (!secret) {
    res.status(500).json({ error: 'Server misconfigured: missing WHATSAPP_GATEWAY_SECRET' })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  next()
}
