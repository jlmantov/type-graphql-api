import { Request, Response } from "express";
import { JwtAccessPayload } from "./auth";

export interface GraphqlContext {
  req: Request;
  res: Response;
  payload?: JwtAccessPayload;
}
