package filejson

import "mp01/internal/model"

type DiscoveryHostsRepository struct {
	path string
}

func NewDiscoveryHostsRepository(path string) *DiscoveryHostsRepository {
	return &DiscoveryHostsRepository{path: path}
}

func (r *DiscoveryHostsRepository) Load() ([]model.DiscoveryHost, error) {
	var hosts []model.DiscoveryHost
	if err := readJSON(r.path, &hosts); err != nil {
		return nil, err
	}

	return hosts, nil
}
