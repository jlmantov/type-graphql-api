import { Request, Response } from "express";

export interface GraphqlContext {
  req: Request;
  res: Response;
  user?: {
    id: number;
    tokenVersion: number;
  }
}
