// utils/requestMeta.ts

import { Request } from "express";
import { UAParser } from "ua-parser-js";

export const extractRequestMeta = (
    req: Request
) => {

    const parser = new UAParser(
        req.headers["user-agent"]
    );

    const result = parser.getResult();

    return {
        ipAddress:
            req.headers["x-forwarded-for"]?.toString()
                .split(",")[0]
                .trim() ||
            req.socket.remoteAddress,

        userAgent:
            req.headers["user-agent"],

        browser:
            `${result.browser.name || "Unknown"} ${result.browser.version || ""}`,

        os:
            `${result.os.name || "Unknown"} ${result.os.version || ""}`,

        deviceType:
            result.device.type || "desktop",

        deviceId:
            req.headers["x-device-id"]?.toString(),
    };
};

