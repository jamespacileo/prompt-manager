export interface best_time_to_go_out_based_on_weatherInput {
  currentWeather: {
  temperature: number;
  precipitation: string;
  windSpeed: number;
  humidity: number;
};
  forecast: {
  time: string;
  temperature: number;
  precipitation: string;
  windSpeed: number;
  humidity: number;
}[];
  activityType: string;
}

export interface best_time_to_go_out_based_on_weatherOutput {
  bestTime: string;
  reasoning: string;
}