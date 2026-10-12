package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"math"

	"github.com/facerec/facerec-be/facerec/module/faces/domain"
)

func (u *faceUseCase) MatchFace(ctx context.Context, candidateVector []float32, allowedUserIds []string) (*domain.MatchFaceResponse, error) {
	if len(candidateVector) == 0 {
		return nil, errors.New("vektor wajah tidak boleh kosong")
	}

	var candidates []*domain.StudentFace
	var err error

	if len(allowedUserIds) > 0 {
		candidates, err = u.repo.FindByUserIDs(ctx, allowedUserIds)
	}

	if len(candidates) == 0 {
		candidates, err = u.repo.FindAllWithVectors(ctx)
	}

	if err != nil {
		return nil, err
	}

	bestMatch := &domain.MatchFaceResponse{IsMatch: false}
	highestSimilarity := -1.0

	for _, cand := range candidates {
		if cand.FaceVector == "" {
			continue
		}

		var vec []float32
		if err := json.Unmarshal([]byte(cand.FaceVector), &vec); err != nil {
			continue
		}

		sim := cosineSimilarity(candidateVector, vec)
		eucDist := euclideanDistance(candidateVector, vec)

		var isMatched bool
		if len(allowedUserIds) > 0 {
			isMatched = sim >= 0.55 && eucDist <= 0.70
		} else {
			isMatched = sim >= 0.60 && eucDist <= 0.65
		}

		if sim > highestSimilarity {
			highestSimilarity = sim
		}

		if isMatched && (sim > bestMatch.ConfidenceScore || !bestMatch.IsMatch) {
			bestMatch.IsMatch = true
			bestMatch.StudentId = cand.UserId
			bestMatch.FullName = cand.FullName
			bestMatch.Nim = cand.Nim
			conf := math.Max(sim, 1.0-(eucDist/2.0))
			if conf < 0.85 {
				conf = 0.85 + (sim * 0.1)
			}
			if conf > 0.99 {
				conf = 0.99
			}
			bestMatch.ConfidenceScore = conf
			bestMatch.FaceData = cand
		}
	}

	if !bestMatch.IsMatch && highestSimilarity > 0 {
		bestMatch.ConfidenceScore = highestSimilarity
	}

	return bestMatch, nil
}

func euclideanDistance(a, b []float32) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 1.0
	}
	var sum float64
	for i := 0; i < len(a); i++ {
		diff := float64(a[i] - b[i])
		sum += diff * diff
	}
	return math.Sqrt(sum)
}

func cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0.0
	}

	var dotProduct float64
	var normA float64
	var normB float64

	for i := 0; i < len(a); i++ {
		valA := float64(a[i])
		valB := float64(b[i])
		dotProduct += valA * valB
		normA += valA * valA
		normB += valB * valB
	}

	if normA == 0 || normB == 0 {
		return 0.0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}
