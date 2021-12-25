import { Request, Response } from "express";
import { JwtAccessPayload } from "../../utils/auth";

export interface GraphqlContext {
  req: Request;
  res: Response;
  payload?: JwtAccessPayload;
}
