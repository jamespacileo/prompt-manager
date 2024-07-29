export interface summarize_weatherInput {
  location: string;
}

export interface summarize_weatherOutput {
  temperature: string;
  humidity: string;
  windSpeed: string;
  weatherEvents: string;
}