package postgresql

import (
	"context"
	"errors"

	"github.com/facerec/facerec-be/facerec/module/reading_resumes/domain"
	"gorm.io/gorm"
)

type resumeRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) domain.ResumeRepository {
	return &resumeRepository{db: db}
}

func (r *resumeRepository) FindAll(ctx context.Context, memberID string, bookID string, search string) ([]*domain.ReadingResume, error) {
	var list []*domain.ReadingResume
	q := r.db.WithContext(ctx).Order("submitted_at DESC")

	if memberID != "" {
		q = q.Where("member_id = ?", memberID)
	}
	if bookID != "" {
		q = q.Where("book_id = ?", bookID)
	}
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("title ILIKE ? OR summary ILIKE ? OR key_insights ILIKE ?", like, like, like)
	}

	err := q.Find(&list).Error
	if err != nil {
		return nil, err
	}

	for _, item := range list {
		r.enrichResume(ctx, item)
	}

	return list, nil
}

func (r *resumeRepository) FindByID(ctx context.Context, id string) (*domain.ReadingResume, error) {
	var item domain.ReadingResume
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	r.enrichResume(ctx, &item)
	return &item, nil
}

func (r *resumeRepository) Store(ctx context.Context, resume *domain.ReadingResume) error {
	return r.db.WithContext(ctx).Create(resume).Error
}

func (r *resumeRepository) Update(ctx context.Context, resume *domain.ReadingResume) error {
	return r.db.WithContext(ctx).Save(resume).Error
}

func (r *resumeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.ReadingResume{}, "id = ?", id).Error
}

func (r *resumeRepository) GetAggregateInsights(ctx context.Context) (*domain.ReadingAggregateInsights, error) {
	var totalResumes int64
	_ = r.db.WithContext(ctx).Model(&domain.ReadingResume{}).Count(&totalResumes).Error

	var avgResult struct {
		AvgVal float64
	}
	_ = r.db.WithContext(ctx).Model(&domain.ReadingResume{}).Select("COALESCE(AVG(rating), 0) as avg_val").Scan(&avgResult).Error

	// Top Categories from books of resumes
	var catRows []struct {
		Category string
		Count    int64
	}
	_ = r.db.WithContext(ctx).
		Table("reading_resumes").
		Select("books.category, COUNT(reading_resumes.id) as count").
		Joins("JOIN books ON books.id = reading_resumes.book_id").
		Group("books.category").
		Order("count DESC").
		Limit(5).
		Scan(&catRows).Error

	var topCategories []domain.CategoryInsight
	for _, row := range catRows {
		pct := 0.0
		if totalResumes > 0 {
			pct = (float64(row.Count) / float64(totalResumes)) * 100.0
		}
		topCategories = append(topCategories, domain.CategoryInsight{
			Category:   row.Category,
			Count:      row.Count,
			Percentage: pct,
		})
	}

	// Reader Leaderboard
	var leaderRows []struct {
		MemberID     string
		MemberName   string
		MemberCode   string
		TotalResumes int64
	}
	_ = r.db.WithContext(ctx).
		Table("reading_resumes").
		Select("library_members.id as member_id, library_members.full_name as member_name, library_members.member_code as member_code, COUNT(reading_resumes.id) as total_resumes").
		Joins("JOIN library_members ON library_members.id = reading_resumes.member_id").
		Group("library_members.id, library_members.full_name, library_members.member_code").
		Order("total_resumes DESC").
		Limit(10).
		Scan(&leaderRows).Error

	var leaderboard []domain.ReaderLeaderboardItem
	for i, row := range leaderRows {
		leaderboard = append(leaderboard, domain.ReaderLeaderboardItem{
			MemberID:       row.MemberID,
			MemberName:     row.MemberName,
			MemberCode:     row.MemberCode,
			TotalResumes:   row.TotalResumes,
			TotalBooksRead: row.TotalResumes,
			Rank:           i + 1,
		})
	}

	return &domain.ReadingAggregateInsights{
		TotalResumesSubmitted: totalResumes,
		AverageRating:         avgResult.AvgVal,
		TopCategories:         topCategories,
		Leaderboard:           leaderboard,
	}, nil
}

func (r *resumeRepository) enrichResume(ctx context.Context, item *domain.ReadingResume) {
	var m struct {
		FullName   string
		MemberCode string
	}
	if err := r.db.WithContext(ctx).Table("library_members").Select("full_name, member_code").Where("id = ?", item.MemberID).Scan(&m).Error; err == nil {
		item.MemberName = m.FullName
		item.MemberCode = m.MemberCode
	}

	var b struct {
		Title    string
		Author   string
		Category string
		CoverURL string
	}
	if err := r.db.WithContext(ctx).Table("books").Select("title, author, category, cover_url").Where("id = ?", item.BookID).Scan(&b).Error; err == nil {
		item.BookTitle = b.Title
		item.BookAuthor = b.Author
		item.BookCategory = b.Category
		item.BookCoverURL = b.CoverURL
	}
}
