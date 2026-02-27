import { Request, Response } from "express";
import { LocationService } from "./location.service";
import { ApiError } from "../../utils/ApiError";


export const fetchPostcodeLocation = async (req: Request, res: Response) => {
  const locationService = new LocationService();
  const { postcode, deviceId, miles } = req.body;

  if (!postcode?.trim()) {
    return res.status(400).json({ message: 'Postcode is required' });
  }

  if (!deviceId?.trim()) {
    return res.status(400).json({ message: 'Device ID is required' });
  }

  if (!miles || miles <= 0) {
    return res.status(400).json({ message: 'Miles Travel is required' });
  }

  try {
    const locationData = await locationService.getLocationByPostcode(
      postcode,
      deviceId,
      Number(miles)
    );

    // res.status(201).json(locationData);
     res.status(201).json({
      status: true,
      message: 'Locations created successfully',
      data: locationData
    });


  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Internal server error'
    });
  }
};


export const getDistance = async (req: Request, res: Response) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: 'Both "from" and "to" locations are required' });
  }

  try {
    const distance = await new LocationService().calculateDistance(from, to);

    res.json({ distanceInMiles: distance });
  } catch (error) {
    console.error(error);

    // ✅ Proper ApiError handling
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};  



