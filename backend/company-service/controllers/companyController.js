import { getAllCompaniesDB, getCompanyByCodeDB, createCompanyDB, updateCompanyDB, deleteCompanyDB, updateCompanyCreditDB } from '../models/companyModel.js';

export const getCompanies = async (req, res, next) => {
  try {
    const list = await getAllCompaniesDB();
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyByCode = async (req, res, next) => {
  try {
    const company = await getCompanyByCodeDB(req.params.code);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: `Company not found with code ${req.params.code}`
      });
    }
    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

export const createCompany = async (req, res, next) => {
  const { code, name, phone, address, taxNumber, agent } = req.body;
  try {
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide company code and name'
      });
    }

    // Check if company code already exists
    const exists = await getCompanyByCodeDB(code);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Company with code ${code.toUpperCase()} already exists`
      });
    }

    const payload = { code, name, phone, address, taxNumber, agent };
    const newCompany = await createCompanyDB(payload);

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: newCompany
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  const { code } = req.params;
  const { name, phone, address, taxNumber, agent } = req.body;
  try {
    const exists = await getCompanyByCodeDB(code);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Company with code ${code} not found`
      });
    }

    const payload = { name, phone, address, taxNumber, agent };
    const updated = await updateCompanyDB(code, payload);

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  const { code } = req.params;
  try {
    const exists = await getCompanyByCodeDB(code);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Company with code ${code} not found`
      });
    }

    await deleteCompanyDB(code);

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanyCredit = async (req, res, next) => {
  const { code } = req.params;
  const { creditAmount } = req.body;
  try {
    const numericCredit = parseFloat(creditAmount);
    if (isNaN(numericCredit) || numericCredit <= 0) {
      return res.status(400).json({ success: false, message: 'creditAmount must be a positive number' });
    }

    await updateCompanyCreditDB(code, numericCredit);

    res.status(200).json({
      success: true,
      message: `Credit balance updated for company ${code}`
    });
  } catch (error) {
    next(error);
  }
};
