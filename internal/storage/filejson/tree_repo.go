package filejson

import "mp01/internal/model"

type TreeRepository struct {
	path string
}

func NewTreeRepository(path string) *TreeRepository {
	return &TreeRepository{path: path}
}

func (r *TreeRepository) Load() (model.TreeData, error) {
	var treeData model.TreeData
	if err := readJSON(r.path, &treeData); err != nil {
		return nil, err
	}

	return treeData, nil
}
