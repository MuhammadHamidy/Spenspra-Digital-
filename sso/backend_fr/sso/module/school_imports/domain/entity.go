package domain

import (
	"context"
	"io"
)

type ImportErrorDetail struct {
	Row    int    `json:"row"`
	Column string `json:"column"`
	Error  string `json:"error"`
}

type TeacherCredentialItem struct {
	ID       string `json:"id"`
	NIP      string `json:"nip"`
	FullName string `json:"full_name"`
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

type ImportResultResponse struct {
	TotalRows   int                     `json:"total_rows"`
	Inserted    int                     `json:"inserted"`
	Failed      int                     `json:"failed"`
	Errors      []ImportErrorDetail     `json:"errors,omitempty"`
	Credentials []TeacherCredentialItem `json:"credentials,omitempty"`
}

type UseCase interface {
	ImportStudentsFromExcel(ctx context.Context, fileReader io.Reader) (*ImportResultResponse, error)
	ImportTeachersFromExcel(ctx context.Context, fileReader io.Reader) (*ImportResultResponse, error)
	GenerateStudentTemplateExcel() ([]byte, error)
	GenerateTeacherTemplateExcel() ([]byte, error)
}
