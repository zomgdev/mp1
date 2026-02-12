package filejson

import "mp01/internal/model"

type SchemeRepository struct {
	path string
}

func NewSchemeRepository(path string) *SchemeRepository {
	return &SchemeRepository{path: path}
}

func (r *SchemeRepository) Load() (model.Scheme, error) {
	var raw map[string]interface{}
	if err := readJSON(r.path, &raw); err != nil {
		return model.Scheme{}, err
	}

	return model.NormalizeScheme(raw), nil
}

func (r *SchemeRepository) Save(scheme model.Scheme) error {
	return writeJSON(r.path, scheme)
}
