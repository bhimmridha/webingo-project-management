/**
 * Paginate a Mongoose query
 * @param {Model} model - Mongoose model
 * @param {Object} query - filter query
 * @param {Object} options - { page, limit, sort, populate }
 */
const paginate = async (model, query = {}, options = {}) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  let q = model.find(query).sort(sort).skip(skip).limit(limit).lean();

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(p => { q = q.populate(p); });
    } else {
      q = q.populate(options.populate);
    }
  }

  const [data, total] = await Promise.all([q, model.countDocuments(query)]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  };
};

module.exports = { paginate };
