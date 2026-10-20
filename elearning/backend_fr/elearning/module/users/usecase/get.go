package usecase

import (
	"context"
	errs "errors"

	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog"
	"github.com/rapor/rapor-be/libraries/errors"
	"github.com/rapor/rapor-be/rapor/module/users/domain"
)

// Get retrieves a user by ID.
func (u *UseCase) Get(ctx context.Context, id string) (*domain.User, error) {
	ctx, span := u.tracer.Start(ctx, "Get")
	defer span.End()

	logger := zerolog.Ctx(ctx)

	user, err := u.repository.FindByID(ctx, id)
	if err != nil {
		if errs.Is(err, pgx.ErrNoRows) {
			return nil, errors.NotFound("user not found")
		}

		logger.Error().
			Str("func", "repository.FindByID").
			Err(err).
			Msg("failed to find user")

		return nil, errors.InternalServerError("failed to find user")
	}

	return user, nil
}
