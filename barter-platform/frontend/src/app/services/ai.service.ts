import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface GenerateCaptionRequest {
  description: string;
  tone: 'Casual' | 'Professional' | 'Funny' | 'Friendly' | 'Motivational' | 'Luxury';
  length: 'Short' | 'Medium' | 'Long';
  platform: 'Instagram' | 'LinkedIn' | 'Facebook' | 'X';
  includeEmojis: boolean;
  includeHashtags: boolean;
}

export interface GenerateCaptionResponse {
  success: boolean;
  data: {
    caption: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  generateCaption(payload: GenerateCaptionRequest): Observable<GenerateCaptionResponse> {
    return this.http.post<GenerateCaptionResponse>(`${this.apiUrl}/ai/generate-caption`, payload, {
      withCredentials: true,
    });
  }
}
